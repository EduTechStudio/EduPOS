const fs = require('fs');
let code = fs.readFileSync('src/components/ui/Icon.tsx', 'utf-8');

code = code.replace(
  "  | 'close';",
  "  | 'close'\n  | 'logout'\n  | 'edit'\n  | 'plus'\n  | 'backspace'\n  | 'login';"
);
code = code.replace(
  "  close: '❌',",
  "  close: '❌',\n  logout: '🚪',\n  edit: '✏️',\n  plus: '➕',\n  backspace: '⌫',\n  login: '🔑',"
);

fs.writeFileSync('src/components/ui/Icon.tsx', code);

// Revert LoginScreen backspace and check
let loginCode = fs.readFileSync('src/components/auth/LoginScreen.tsx', 'utf-8');
loginCode = loginCode.replace('name="close"', 'name="backspace"');
loginCode = loginCode.replace('name="check"', 'name="login"');
fs.writeFileSync('src/components/auth/LoginScreen.tsx', loginCode);

// Add missing "action" to SectionHeaderProps
let headerCode = fs.readFileSync('src/components/layout/SectionHeader.tsx', 'utf-8');
if (!headerCode.includes('action?:')) {
  headerCode = headerCode.replace(
    "  subtitle?: string;",
    "  subtitle?: string;\n  action?: { icon: string; label: string; onPress: () => void; };"
  );
  
  const insertActionUI = `
      </View>
      {action && (
        <TouchableOpacity style={styles.actionBtn} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  `;
  
  headerCode = headerCode.replace(
    "      </View>\n    </View>",
    insertActionUI
  );
  
  headerCode = headerCode.replace(
    "    alignItems: 'flex-start',",
    "    alignItems: 'center',\n    flexDirection: 'row',\n    justifyContent: 'space-between',"
  );
  
  const insertStyle = `
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  actionText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
});
`;
  headerCode = headerCode.replace(/}\);\s*$/, insertStyle);
  fs.writeFileSync('src/components/layout/SectionHeader.tsx', headerCode);
}
