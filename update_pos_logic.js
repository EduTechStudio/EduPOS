const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

// 1. Add imports
content = content.replace("import React, { useState, useEffect, useMemo, useRef } from 'react';", "import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';\nimport { useFocusEffect } from 'expo-router';\nimport { settingsRepository } from '@/database';");

// 2. Add state
content = content.replace("const { isTablet } = useResponsive();", "const { isTablet } = useResponsive();\n  const [posConfig, setPosConfig] = useState(defaultPOSConfig);");

// 3. Add useFocusEffect
const effectCode = `
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadPosConfig = async () => {
        try {
          const setting = await settingsRepository.get('pos_config');
          if (setting && setting.value && isActive) {
            setPosConfig(prev => ({ ...prev, ...JSON.parse(setting.value) }));
          }
        } catch(e) {
          console.error(e);
        }
      };
      loadPosConfig();
      return () => { isActive = false; };
    }, [])
  );
`;
content = content.replace("  // State for Catalog", effectCode + "\n  // State for Catalog");

// 4. Update isSplitView
content = content.replace("const isSplitView = isTablet && posConfig.tabletLayout.splitView;", ""); // remove if already there
content = content.replace("  const totals: CartTotals = posService.calculateTotals(cart, discount);", "  const totals: CartTotals = posService.calculateTotals(cart, discount);\n  const isSplitView = isTablet && posConfig.tabletLayout.splitView;");

// replace isTablet in render logic with isSplitView
content = content.replace(/isTablet \? styles\.tabletSplitView/g, "isSplitView ? styles.tabletSplitView");
content = content.replace(/isTablet \? styles\.catalogColumnTablet/g, "isSplitView ? styles.catalogColumnTablet");
content = content.replace(/\{isTablet && \(/g, "{isSplitView && (");
content = content.replace(/\{!isTablet && cart\.length > 0 && \(/g, "{!isSplitView && cart.length > 0 && (");

// 5. Product Grid vs List Styles
content = content.replace(/<View style=\{styles\.productGrid\}>/g, "<View style={posConfig.layout === 'list' ? styles.productList : styles.productGrid}>");
content = content.replace(/style=\s*\{\[styles\.productCard, isOutOfStock && styles\.outOfStockCard\]\}/g, "style={[posConfig.layout === 'list' ? styles.productCardList : styles.productCard, isOutOfStock && styles.outOfStockCard]}");
content = content.replace(/subtitle=\{\`Layout: \$\{defaultPOSConfig\.layout\}/g, "subtitle={`Layout: ${posConfig.layout}");

fs.writeFileSync('src/app/pos.tsx', content);
