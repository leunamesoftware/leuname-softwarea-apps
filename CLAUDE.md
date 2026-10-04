# LeuName Softwares — apps

- Loja própria: **LeuApps** (www.leunamesoftware.com.br), na pasta `leuapps/`. Não usamos a Play Store.
- Servidor de vendas e contas (Mercado Pago, e-mail + senha) e o app Quanto Cobrar: pasta `calculadora/`.
- **Para criar ou publicar um app novo na loja, siga `leuapps/COMO-PUBLICAR-APP.md`.**
- Respostas curtas, em português, direto ao ponto.

## Receitas do Quanto Cobrar (o dono manda foto + texto)
1. Foto: rodar `python3 scripts/foto_receita.py <foto> <id>` em `calculadora/` (gera a foto leve em WebP e a miniatura do sumário).
   No JSON: `"foto": "/img/receitas/<id>.webp"`.
2. Acrescentar no fim de `calculadora/src/receitas.json`, no mesmo formato das outras:
   - quantidades em g/ml/un, com a medida caseira em `caseira`;
   - `emb` com o preço de referência da embalagem;
   - `rendimento` (unidades, peso da unidade e faixa);
   - `gas` (minutos e chama);
   - `dicaVenda`.
3. Ingrediente opcional fica fora do custo; cite no modo de preparo.
4. Rodar `node --test test/*.mjs` em `calculadora/`, fazer commit e push no branch `ccr-f58cd13b-ml0bzs`
   e disparar o workflow `calculadora-publicar.yml` no repositório leunamesoftware/Leunamesite.
5. Responder ao dono com o link único de divulgação (o mesmo para todas as receitas):
   `www.leunamesoftware.com.br/quantocobrar` (abre a página de venda dentro da loja).
