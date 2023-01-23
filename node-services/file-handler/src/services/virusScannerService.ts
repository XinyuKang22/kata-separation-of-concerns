import NodeClam from "clamscan";
import { FastifyBaseLogger } from "fastify";
import { Readable } from "stream";

/**
 * A service which deals with running virus scans
 *
 * @param clamAVOptions the options to pass to the clamAV instance
 */
export class ClamAVService {
  constructor(protected clamAVOptions: NodeClam.Options) {}

  /**
   * Runs ClamAV against a given file.
   *
   * @param stream The file to scan
   * @param filename The name of the file that is being scanned
   * @param log Logger
   * @returns If the virus scan detects the file is infected
   */
  async scanStreamForInfections(
    stream: Readable,
    filename: string,
    log: FastifyBaseLogger
  ): Promise<boolean> {
    // NodeClam().init mutates values passed to it so we give it a copy
    const tempOptions = { ...this.clamAVOptions };
    const clamScan = await new NodeClam().init(tempOptions);
    log.info(
      `Connected to remote clamScan Instance [${JSON.stringify(
        clamScan.settings.clamdscan
      )}].`
    );
    log.info(`Scanning file [${filename}] for viruses`);
    const scanResults = await clamScan.scanStream(stream);
    if (scanResults.isInfected) {
      log.warn(
        `Found [${
          scanResults.viruses.length
        }] viruses in [${filename}] : [${scanResults.viruses.join(", ")}].`
      );
    } else {
      log.info(`Found 0 viruses in [${filename}].`);
    }
    return scanResults.isInfected;
  }
}
