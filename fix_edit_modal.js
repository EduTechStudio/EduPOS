const fs = require('fs');
let code = fs.readFileSync('src/components/users/EditUserModal.tsx', 'utf-8');

code = code.replace(
  "        // Save new overrides\n        for (const [permId, effect] of Object.entries(overrides)) {\n          await userPermRepo.setOverride(user.id, permId, effect);\n        }",
  `        // Save new overrides
        for (const [permId, effect] of Object.entries(overrides)) {
          await userPermRepo.setOverride(user.id, permId, effect);
          console.log('[Users][Permissions] SAVE', { userId: user.id, permissionId: permId, effect });
        }
        
        // Read back to verify
        const savedOverrides = await userPermRepo.getOverridesForUser(user.id);
        console.log('[Users][Permissions] DB VERIFY', savedOverrides);`
);

fs.writeFileSync('src/components/users/EditUserModal.tsx', code);
