const fs = require('fs');
const files = ['src/components/users/AddUserModal.tsx', 'src/components/users/EditUserModal.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  
  // Fix the container style to not collapse the scrollview
  code = code.replace(
    "    maxHeight: '90%',\n  },",
    "    maxHeight: '90%',\n    flexShrink: 1,\n  },"
  );
  
  // We can also just remove flex: 1 from formScroll and rely on flexShrink
  code = code.replace(
    "  formScroll: {\n    flex: 1,\n  },",
    "  formScroll: {\n    flexShrink: 1,\n  },"
  );

  fs.writeFileSync(file, code);
}
