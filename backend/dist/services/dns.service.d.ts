interface DNSRecordResult {
    success: boolean;
    recordId?: string;
    error?: string;
}
interface DNSRecord {
    name: string;
    type: string;
    ttl: number;
    data: string[];
}
export declare class DNSService {
    private dns;
    private zone;
    private readonly zoneName;
    private readonly domain;
    constructor();
    /**
     * Get the DNS zone (cached)
     */
    private getZone;
    /**
     * Create an A record for a subdomain
     */
    createARecord(subdomain: string, ipAddress: string): Promise<DNSRecordResult>;
    /**
     * Update an existing A record
     */
    updateARecord(subdomain: string, newIpAddress: string, oldIpAddress?: string): Promise<DNSRecordResult>;
    /**
     * Delete an A record
     */
    deleteARecord(subdomain: string, ipAddress?: string): Promise<DNSRecordResult>;
    /**
     * Check if a subdomain DNS record exists
     */
    recordExists(subdomain: string): Promise<boolean>;
    /**
     * List all A records in the zone
     */
    listRecords(): Promise<DNSRecord[]>;
    /**
     * Get DNS record for a specific subdomain
     */
    getRecord(subdomain: string): Promise<DNSRecord | null>;
    /**
     * Verify DNS service is working
     */
    healthCheck(): Promise<boolean>;
}
export declare const dnsService: DNSService;
export {};
//# sourceMappingURL=dns.service.d.ts.map