const fs = require('fs');

const files = [
  'src/components/users/AddUserModal.tsx',
  'src/components/users/EditUserModal.tsx',
  'src/components/users/ChangePinModal.tsx',
  'src/app/settings/users-permissions.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  
  if (!code.includes("import { userService }")) {
    code = code.replace(
      "import { UserRepository } from '@/database/repositories/UserRepository';",
      "import { UserRepository } from '@/database/repositories/UserRepository';\nimport { userService } from '@/services/user/UserService';"
    );
  }
  
  // Replace repo.create with userService.create
  code = code.replace(/const repo = new UserRepository\(\);([\s\S]*?)await repo\.create/g, "const repo = new UserRepository();$1await userService.create");
  code = code.replace(/await repo\.update/g, "await userService.update");
  code = code.replace(/await repo\.deactivate/g, "await userService.deactivate");
  code = code.replace(/await repo\.activate/g, "await userService.activate");
  
  // users-permissions.tsx uses userRepo explicitly
  code = code.replace(/await userRepo\.activate/g, "await userService.activate");
  code = code.replace(/await userRepo\.deactivate/g, "await userService.deactivate");

  fs.writeFileSync(file, code);
});
