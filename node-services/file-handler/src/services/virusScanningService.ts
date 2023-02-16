import NodeClam from "clamscan";
import { Readable } from "stream";

export type VirusScanningServiceConfiguration =  {
    host: string;
    port: number;
}

export class VirusScanningService {
    readonly configuration: VirusScanningServiceConfiguration;

    constructor(configuration: VirusScanningServiceConfiguration) {
        this.configuration = configuration;
    }

    async scanContentForViruses(fileBuffer:Buffer) {
        const tempOptions = { 
          debugMode: false,
          clamscan: {
              active: false,
          },
          clamdscan: {
              host: this.configuration.host,
              port: this.configuration.port,
              localFallback: false,
          }
        };
        const clamScan = await new NodeClam().init(tempOptions);
        const scanResults = await clamScan.scanStream(Readable.from(fileBuffer));
        return scanResults;
    }
}