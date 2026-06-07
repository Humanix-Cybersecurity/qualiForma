// SPDX-License-Identifier: AGPL-3.0-or-later
import type { FactureData } from './facture';

function esc(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}
const eur = (cents: number) => (cents / 100).toFixed(2);
const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '');

/**
 * Construit le XML Factur-X (Cross Industry Invoice, profil MINIMUM — EN 16931 / Factur-X 1.0).
 * Destiné à être embarqué dans la facture PDF (hybride PDF/A-3) et/ou déposé sur une PDP.
 *
 * ⚠️ Socle : le profil MINIMUM couvre les totaux et l'entête. La conformité PDF/A-3 complète
 * (métadonnées XMP, profil colorimétrique) et les profils BASIC/EN16931 sont des évolutions.
 */
export function buildFacturXXml(data: FactureData): string {
  const vendeur = esc(data.organisme.nom);
  const acheteur = esc(data.client ?? 'Client');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(data.numero)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${day(data.dateEmission)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty><ram:Name>${vendeur}</ram:Name></ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${acheteur}</ram:Name></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>${eur(data.totalHtCents)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${eur(data.totalTvaCents)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${eur(data.totalTtcCents)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${eur(data.totalTtcCents - data.montantPayeCents)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}
