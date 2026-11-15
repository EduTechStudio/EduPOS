import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { ReceiptData } from '@/services/receipt/ReceiptService';
import { ReceiptTemplate, ReceiptWidth } from '@/types/receiptTemplate';
import { ReceiptDocument, ReceiptDocumentNode } from '@/types/receiptDocument';
import {
  compileReceiptDocument,
  compileLegacyReceiptDocument,
  resolveReceiptPaperWidth,
} from '@/services/receipt/ReceiptDocumentCompiler';
import { receiptTemplateService } from '@/services/receipt/ReceiptTemplateService';
import { formatCurrency, formatNumber } from '@/utils/currency';
import {
  formatRightAlignedCurrencyRow,
  formatItemRow,
  formatAlignedRow,
} from '@/services/receipt/receiptLayoutHelper';

interface ReceiptPreviewProps {
  receiptData: ReceiptData;
  width?: '58mm' | '80mm';
  template?: ReceiptTemplate;
  document?: ReceiptDocument;
}

export function ReceiptPreview({ receiptData, width, template, document }: ReceiptPreviewProps) {
  const [activeTemplate, setActiveTemplate] = useState<ReceiptTemplate | null>(null);

  useEffect(() => {
    if (!document && !template && !receiptData?.template) {
      let isMounted = true;
      receiptTemplateService
        .getActiveTemplate()
        .then((t) => {
          if (isMounted && t) {
            setActiveTemplate(t);
          }
        })
        .catch((err) => {
          console.warn('[ReceiptPreview] Could not load active template:', err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [document, template, receiptData?.template]);

  const targetWidth: ReceiptWidth = useMemo(() => {
    return resolveReceiptPaperWidth({
      explicitWidth: width || receiptData?.targetWidth,
      templateWidth: template?.paperWidth || receiptData?.template?.paperWidth || activeTemplate?.paperWidth,
      configWidth: receiptData?.config?.receiptWidth,
    });
  }, [
    width,
    receiptData?.targetWidth,
    template?.paperWidth,
    receiptData?.template?.paperWidth,
    activeTemplate?.paperWidth,
    receiptData?.config?.receiptWidth,
  ]);

  const is80mm = targetWidth === '80mm';
  const containerWidth = is80mm ? 360 : 280;

  const compiledDoc: ReceiptDocument = useMemo(() => {
    if (document) {
      return document;
    }
    const currentTemplate = template || receiptData?.template || activeTemplate;
    if (currentTemplate) {
      return compileReceiptDocument(currentTemplate, receiptData, { targetWidth });
    }
    return compileLegacyReceiptDocument(receiptData, { targetWidth });
  }, [document, template, receiptData, activeTemplate, targetWidth]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.paper, { width: containerWidth }]}>
        {compiledDoc.nodes.map((node, index) =>
          renderReceiptNode(node, index, is80mm, receiptData)
        )}
      </View>
    </ScrollView>
  );
}

function renderReceiptNode(
  node: ReceiptDocumentNode,
  index: number,
  is80mm: boolean,
  receiptData: ReceiptData
) {
  switch (node.type) {
    case 'logo': {
      const logoUri = node.uri || receiptData.config?.logo;
      if (!logoUri) return null;
      const alignSelf =
        node.align === 'left' ? 'flex-start' : node.align === 'right' ? 'flex-end' : 'center';
      return (
        <View key={index} style={[styles.nodeWrapper, { alignItems: alignSelf, marginBottom: 8 }]}>
          <Image
            source={{ uri: logoUri }}
            style={{ width: 80, height: 80, resizeMode: 'contain' }}
          />
        </View>
      );
    }

    case 'text_line': {
      const baseFontSize = is80mm ? 10.5 : 12;
      const fontSize =
        node.size === 'small' ? baseFontSize - 1 : node.size === 'large' ? baseFontSize + 2 : baseFontSize;
      const fontWeight = node.bold ? 'bold' : 'normal';
      return (
        <View key={index} style={styles.nodeWrapper}>
          <Text
            allowFontScaling={false}
            style={[
              styles.textLine,
              {
                textAlign: node.align || 'left',
                fontSize,
                fontWeight,
              },
            ]}
          >
            {node.text}
          </Text>
        </View>
      );
    }

    case 'key_value_row': {
      const columns = is80mm ? 48 : 32;
      const rowLine = formatAlignedRow(node.key, node.value, columns);
      const fontSize = is80mm ? 10.5 : 12;
      return (
        <View key={index} style={styles.nodeWrapper}>
          <Text
            allowFontScaling={false}
            style={[styles.textLine, { fontSize }]}
          >
            {rowLine}
          </Text>
        </View>
      );
    }

    case 'currency_row': {
      const isLarge = node.size === 'large';
      const isBold = Boolean(node.bold || isLarge);
      const columns = is80mm ? 48 : 32;
      const rowLine = formatRightAlignedCurrencyRow(
        node.label,
        node.amount,
        columns,
        {
          isNegative: node.isNegative,
          prefix: node.prefix,
          currency: node.currency || 'Rp.',
        }
      );
      const baseFontSize = is80mm ? 10.5 : 12;
      const fontSize = isLarge ? baseFontSize + 2 : baseFontSize;
      return (
        <View key={index} style={styles.nodeWrapper}>
          <Text
            allowFontScaling={false}
            style={[
              styles.textLine,
              { fontSize },
              isBold && styles.boldText,
            ]}
          >
            {rowLine}
          </Text>
        </View>
      );
    }

    case 'item_row': {
      const columns = is80mm ? 48 : 32;
      const lines = formatItemRow(
        node.name,
        node.quantity,
        node.unitPrice,
        node.subtotal,
        columns
      );
      const fontSize = is80mm ? 10.5 : 12;
      return (
        <View key={index} style={[styles.nodeWrapper, styles.itemRow]}>
          {lines.map((line, lIdx) => (
            <Text
              key={lIdx}
              allowFontScaling={false}
              style={[styles.textLine, { fontSize }]}
            >
              {line}
            </Text>
          ))}
        </View>
      );
    }

    case 'divider': {
      const char = node.char || (node.style === 'double' ? '=' : '-');
      const columns = is80mm ? 48 : 32;
      const sepString = char.repeat(columns);
      const marginV = node.spacing === 'large' ? 8 : node.spacing === 'small' ? 2 : 4;
      const fontSize = is80mm ? 10.5 : 12;
      return (
        <View key={index} style={[styles.nodeWrapper, { marginVertical: marginV }]}>
          <Text
            style={[styles.separator, { fontSize }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {sepString}
          </Text>
        </View>
      );
    }

    case 'spacer': {
      const height = (node.lines || 1) * 12;
      return <View key={index} style={{ height }} />;
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  paper: {
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeWrapper: {
    width: '100%',
  },
  textLine: {
    fontFamily: 'monospace',
    color: '#111827',
    marginVertical: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
  },
  kvKey: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
  kvValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111827',
    fontWeight: '500',
  },
  separator: {
    width: '100%',
    textAlign: 'center',
    fontFamily: 'monospace',
    color: '#666',
  },
  itemRow: {
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111827',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  itemQtyPrice: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#4b5563',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111827',
  },
  currencyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 125,
  },
  rpCol: {
    fontSize: 12,
    fontFamily: 'monospace',
    width: 30,
    textAlign: 'left',
    color: '#111827',
  },
  amountCol: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'right',
    flex: 1,
    color: '#111827',
  },
  boldText: {
    fontWeight: 'bold',
  },
  largeText: {
    fontSize: 14,
  },
  grandTotalRp: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  grandTotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
