import { Subdomain } from '@prisma/client';
interface CreateSubdomainInput {
    name: string;
    ipAddress: string;
    userId: string;
}
interface UpdateSubdomainInput {
    ipAddress: string;
}
interface SubdomainWithDomain extends Subdomain {
    fullDomain: string;
}
export declare class SubdomainService {
    /**
     * Get all subdomains for a user
     */
    getUserSubdomains(userId: string): Promise<SubdomainWithDomain[]>;
    /**
     * Get subdomain by ID
     */
    getSubdomainById(id: string, userId?: string): Promise<SubdomainWithDomain | null>;
    /**
     * Check if a subdomain name is available
     */
    checkAvailability(name: string): Promise<{
        available: boolean;
        reason?: string;
    }>;
    /**
     * Validate subdomain name format
     */
    private validateSubdomainName;
    /**
     * Validate IP address format
     */
    private validateIpAddress;
    /**
     * Create a new subdomain
     */
    createSubdomain(input: CreateSubdomainInput): Promise<SubdomainWithDomain>;
    /**
     * Update subdomain IP address
     */
    updateSubdomain(id: string, userId: string, input: UpdateSubdomainInput): Promise<SubdomainWithDomain>;
    /**
     * Delete subdomain
     */
    deleteSubdomain(id: string, userId: string): Promise<void>;
    /**
     * Get subdomain statistics
     */
    getStats(userId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
    }>;
}
export declare const subdomainService: SubdomainService;
export {};
//# sourceMappingURL=subdomain.service.d.ts.map