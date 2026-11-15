const fs = require('fs');
let code = fs.readFileSync('src/components/layout/SectionHeader.tsx', 'utf-8');

code = code.replace(
  "  subtitle,\n  rightElement,",
  "  subtitle,\n  action,\n  rightElement,"
);

code = code.replace(
  "{rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}",
  `      {action && !rightElement ? (
        <TouchableOpacity style={[styles.actionBtn, styles.rightElement]} onPress={action.onPress}>
          {action.icon && <Icon name={action.icon} size={20} color={theme.colors.textInverse} style={{marginRight: 8}}/>}
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      ) : rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : null}`
);

fs.writeFileSync('src/components/layout/SectionHeader.tsx', code);
