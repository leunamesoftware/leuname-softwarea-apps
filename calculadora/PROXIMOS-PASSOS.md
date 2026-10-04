# Quanto Cobrar — próximos passos (decididos)

## Situação atual
- App 3.2 no ar. Grátis = 2 primeiras receitas completas (degustação, sem prazo); as demais com cadeado.
- Chave LEU-... libera tudo (vendida no site por Mercado Pago — desligado até salvar `MP_ACCESS_TOKEN`).
- Google Play: app `com.leunamesoftwares.quantocobrar` criado; versão 1.1.5 em **rascunho** na produção.
- Chave do revisor do Google: `LEU-T21M-C8Z6-0F9B` (só para a revisão).

## Planos combinados
| Plano | Preço | O que libera |
|---|---|---|
| Grátis | R$ 0 | 2 receitas |
| Básico | R$ 9,99 (uma vez) | 30 receitas + calculadora |
| Pro | R$ 2,99/mês (assinatura) | todas as receitas (ilimitadas) + calculadora |

Site (canal do WhatsApp) — PRONTO (v3.3): Básico R$ 9,99 e Pro anual R$ 29,90 no Pix ou cartão à vista; Pro mensal R$ 2,99 assinatura no cartão (Mercado Pago `/preapproval`). Falta só o `MP_ACCESS_TOKEN` e um teste real de cada plano.

## Antes de ligar os planos pagos
1. Dono: perfil de pagamentos (CNPJ + banco) no Play Console.
2. Dono: mandar receitas até completar 30 (foto do prato, ingredientes em g/ml, preparo, rendimento e peso da unidade, tempo de fogo).
3. Dono: produtos no Play Console — `basico_30` (produto único) e `pro_mensal` (assinatura).

## Depois disso (desenvolvimento)
- Google Play Billing no app Android (plugin Capacitor) — compra só aparece no app da Play.
- Servidor confirma cada compra no Google (conta de serviço) e guarda o plano/validade no D1;
  assinatura conferida ao abrir o app (renovação/cancelamento automáticos).
- `/api/receitas`: grátis → 2, básico → 30, pro/chave → todas.
- Novo AAB → produção → enviar para revisão.

## Google Play — conta removida (4/out/2026)
- Motivo: DDA 11.4 (informações inconsistentes) — conta bancária da PJ (Trans Antunes) no perfil de pagamentos PF.
- Contestação enviada em 4/out/2026 09:56 — tíquete **1-1772000041037**, com PDF de documentos (identidade, alteração JUCERJA, D-U-N-S 928262790).
- Pedido: reativar a conta ou autorizar conta de organização (D-U-N-S) e fechar a PF.
- Enquanto isso: NÃO criar conta nova; robô do Android não envia para a Play (trilha padrão "nenhuma").
- Vendas seguem pelo site (Mercado Pago) + APK em /baixar.
