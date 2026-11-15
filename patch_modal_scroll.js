const fs = require('fs');

['src/components/users/AddUserModal.tsx', 'src/components/users/EditUserModal.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace("import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';", "import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';");
  content = content.replace("<View style={styles.permissionsBox}>", "<ScrollView style={styles.permissionsBox}>");
  content = content.replace("</View>\n          </View>\n\n          <View style={styles.footer}>", "</ScrollView>\n          </View>\n\n          <View style={styles.footer}>");
  fs.writeFileSync(file, content);
});
