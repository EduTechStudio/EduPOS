const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const additionalStyles = `
  productList: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  productCardList: {
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
`;

content = content.replace("  productGrid: {", additionalStyles + "  productGrid: {");
fs.writeFileSync('src/app/pos.tsx', content);
