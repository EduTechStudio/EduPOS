const fs = require('fs');
let content = fs.readFileSync('src/components/pos/CheckoutModal.tsx', 'utf-8');

// Add settingsRepository import
content = content.replace("import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';", "import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';\nimport { settingsRepository } from '@/database';");

// Replace synchronous const enabledMethods
content = content.replace("  const enabledMethods = defaultPaymentMethods.filter((pm) => pm.enabled);", `  const [enabledMethods, setEnabledMethods] = useState(defaultPaymentMethods.filter((pm) => pm.enabled));

  useEffect(() => {
    if (visible) {
      settingsRepository.get('payment_methods').then(setting => {
        if (setting && setting.value) {
          const loadedMethods = JSON.parse(setting.value);
          setEnabledMethods(loadedMethods.filter((pm: any) => pm.enabled));
          
          // Ensure selected method is still active
          setPaymentMethod(prev => {
             if (!loadedMethods.find((m: any) => m.id === prev && m.enabled)) {
                const firstActive = loadedMethods.find((m: any) => m.enabled);
                return firstActive ? firstActive.id : 'cash';
             }
             return prev;
          });
        }
      });
    }
  }, [visible]);`);

fs.writeFileSync('src/components/pos/CheckoutModal.tsx', content);
