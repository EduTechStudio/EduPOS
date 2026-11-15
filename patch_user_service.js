const fs = require('fs');
let code = fs.readFileSync('src/services/user/UserService.ts', 'utf-8');

const createFunc = `
  async create(user: Omit<UserEntity, 'created_at' | 'updated_at'>): Promise<UserEntity> {
    authorizationService.requirePermission('user.create');
    const existing = await this.userRepo.getByUsername(user.username.trim().toLowerCase());
    if (existing) {
      throw new Error('Username sudah digunakan');
    }
    return this.userRepo.create(user);
  }
`;

code = code.replace(/async create[\s\S]*?return this\.userRepo\.create\(user\);\n  }/, createFunc.trim());
fs.writeFileSync('src/services/user/UserService.ts', code);
