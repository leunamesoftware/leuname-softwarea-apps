// Guarda a última busca e o ranking do app LeunaPets (só o dono) para o Claude ler direto do servidor.
const txt = (v, n) => String(v ?? '').slice(0, n);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export async function guardarRanking(env, d) {
  const lista = Array.isArray(d?.itens) ? d.itens.slice(0, 200) : [];
  const itens = lista.map((i) => ({
    pid: txt(i.pid, 80), nome: txt(i.nome, 120), lojas: num(i.lojas), custo: num(i.custo), frete: num(i.frete), preco: num(i.preco),
    lucro: num(i.lucroAntes ?? i.lucro), margem: num(i.margem), prazo: num(i.prazo), veredito: txt(i.veredito, 2), motivo: txt(i.motivo, 120), score: num(i.score), foto: txt(i.foto, 300),
  }));
  await env.DB.prepare('INSERT INTO cj_ranking (id, consulta, total, itens, atualizado_em) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET consulta=excluded.consulta, total=excluded.total, itens=excluded.itens, atualizado_em=excluded.atualizado_em')
    .bind(txt(d?.consulta, 120), Math.min(Math.max(Number(d?.total) || itens.length, 0), 1000), JSON.stringify(itens), new Date().toISOString()).run();
  return { ok: true, guardados: itens.length };
}
