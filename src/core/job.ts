import { DataReader, DataWriter, DataRecord } from './interfaces';

export class Job {
  public static async run(reader: DataReader, writer: DataWriter): Promise<void> {
    try {
      for await (const record of reader.read()) {
        await writer.write(record);
      }
    } finally {
      await writer.close();
      // Potentially close the reader if it has a close method
    }
  }
}
