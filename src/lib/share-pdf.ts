import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Erzeugt aus dem HTML eine PDF-Datei (A4) und öffnet das Teilen-Menü des Handys. */
export async function sharePdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
  } else {
    await Print.printAsync({ uri });
  }
}

/** Beschriftung des Knopfs auf diesem Gerät */
export const SHARE_PDF_LABEL = 'PDF teilen';
