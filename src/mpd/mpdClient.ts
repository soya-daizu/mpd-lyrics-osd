import Gio from "@girs/gio-2.0";

import {
  currentsongResultTemplate,
  idleResultTemplate,
  statusResultTemplate,
} from "./mpdTypes.js";

const HELLO_PREFIX = "OK MPD ";
const ERROR_PREFIX = "ACK ";
const SUCCESS = "OK";

export default class MPDClient {
  private client: Gio.SocketClient;
  private connection?: Gio.SocketConnection;
  private onPlayerUpdate: () => Promise<void>;

  private readLineCancellable?: Gio.Cancellable;
  private idlePromise?: Promise<void>;
  private commandPromise?: Promise<Record<string, unknown>>;

  private textEncoder = new TextEncoder();

  constructor(onPlayerUpdate: () => Promise<void>) {
    this.client = Gio.SocketClient.new();
    this.onPlayerUpdate = onPlayerUpdate;
  }

  public connect(host: string, port: number) {
    if (this.connection) this.disconnect();

    const address = Gio.NetworkAddress.parse(host, port);
    if (!address) throw new Error("Invalid address");
    this.connection = this.client.connect(address, null);
    if (!this.connection) throw new Error("Connection failed");

    const reader = Gio.DataInputStream.new(this.connection.get_input_stream());
    const [line] = reader.read_line_utf8(null);
    if (!line || !line.startsWith(HELLO_PREFIX))
      throw new Error("Unexpected response");

    console.log(line);
    this.setupIdling();
  }

  public disconnect() {
    this.readLineCancellable?.cancel();
    this.idlePromise = undefined;
    this.commandPromise = undefined;

    this.connection?.close(null);
    this.connection = undefined;
  }

  public setupIdling() {
    if (this.idlePromise) return;

    const idleFunc = async (
      resolve: (value: void) => void,
      reject: (reason?: any) => void
    ) => {
      if (this.commandPromise) await this.commandPromise;
      this.sendCommand("idle", "player");
      this.fetchObject(idleResultTemplate)
        .then((result) => {
          if (result.changed !== "player") reject();
          resolve();
        })
        .catch(() => reject());
    };

    const makePromise = () =>
      new Promise(idleFunc)
        .then(async () => {
          if (!this.idlePromise) return;
          this.idlePromise = undefined;
          await this.onPlayerUpdate();
          this.idlePromise = makePromise();
        })
        .catch(() => {});

    this.idlePromise = makePromise();
  }

  public async currentsong() {
    const restoreIdling = Boolean(this.idlePromise);
    if (this.idlePromise) {
      this.sendCommand("noidle");
      const promise = this.idlePromise;
      this.idlePromise = undefined;
      await promise;
    }
    if (this.commandPromise) await this.commandPromise;

    this.sendCommand("currentsong");
    const promise = this.fetchObject(currentsongResultTemplate);
    this.commandPromise = promise;
    const result = await promise;
    this.commandPromise = undefined;

    if (restoreIdling) this.setupIdling();

    return result;
  }

  public async status() {
    const restoreIdling = Boolean(this.idlePromise);
    if (this.idlePromise) {
      this.sendCommand("noidle");
      const promise = this.idlePromise;
      this.idlePromise = undefined;
      await promise;
    }
    if (this.commandPromise) await this.commandPromise;

    this.sendCommand("status");
    const promise = this.fetchObject(statusResultTemplate);
    this.commandPromise = promise;
    const result = await promise;
    this.commandPromise = undefined;

    if (restoreIdling) this.setupIdling();

    return result;
  }

  private sendCommand(command: string, ...args: string[]) {
    console.debug("command:", command, ...args);
    if (!this.connection) throw new Error("No connection");
    const parts = [command, ...args];
    const stream = this.connection.get_output_stream();
    stream.write_bytes(this.textEncoder.encode(parts.join(" ") + "\n"), null);
  }

  private async fetchObject<T extends Record<string, any>>(type: T) {
    const pairs = await this.readPairs();

    const result = pairs.reduce((acc, [keyStr, value]) => {
      if (!(keyStr in type)) return acc;

      const key = keyStr as keyof T;
      const valueType = typeof type[key];

      if (valueType === "number") acc[key] = Number(value) as T[keyof T];
      else acc[key] = value as T[keyof T];

      return acc;
    }, {} as T);

    return result;
  }

  private async readPairs() {
    if (!this.connection) throw new Error("No connection");
    const pairs: [string, string][] = [];

    const reader = Gio.DataInputStream.new(this.connection.get_input_stream());

    while (true) {
      const line = await this.readLineAsync(reader);
      console.debug("line:", line);
      if (!line) break;
      if (line.startsWith(ERROR_PREFIX))
        throw new Error(line.slice(ERROR_PREFIX.length));
      if (line === SUCCESS) break;

      const [key, value] = line.split(": ");
      pairs.push([key, value]);
    }

    return pairs;
  }

  private readLineAsync(reader: Gio.DataInputStream) {
    return new Promise<string>((resolve, reject) => {
      this.readLineCancellable = Gio.Cancellable.new();
      reader.read_line_async(
        0,
        this.readLineCancellable,
        (reader, res, _data) => {
          if (!reader) {
            reject("Error reading line");
            return;
          }

          const [line] = reader.read_line_finish_utf8(res);
          if (!line) {
            reject("Error reading line");
            return;
          }

          resolve(line);
        }
      );
    });
  }
}
