export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateRandomToken: (bytes?: number) => string;
export declare const hashToken: (token: string) => string;
//# sourceMappingURL=crypto.d.ts.map