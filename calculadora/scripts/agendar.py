"""Agenda a liberação das receitas escondidas que já têm foto: 2 por dia, às 8h e às 19h (horário de Brasília).

Receita escondida sem foto: "liberarEm": "aguardando-foto" (ninguém vê, só o dono).
Depois que a foto real entra (python3 scripts/foto_receita.py <foto> <id>), tire "fotoProvisoria" e rode:
    python3 scripts/agendar.py
Ele dá a cada receita com foto e ainda sem horário o próximo horário livre, na ordem do arquivo.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

RECEITAS = Path(__file__).resolve().parent.parent / 'src' / 'receitas.json'
BRASILIA = timezone(timedelta(hours=-3))
HORARIOS = (8, 19)


def proximos(depois):
    dia = depois.date()
    while True:
        for h in HORARIOS:
            t = datetime(dia.year, dia.month, dia.day, h, tzinfo=BRASILIA)
            if t > depois:
                yield t
        dia += timedelta(days=1)


def agendar(agora=None):
    agora = agora or datetime.now(BRASILIA)
    receitas = json.loads(RECEITAS.read_text())
    marcados = [datetime.fromisoformat(r['liberarEm']) for r in receitas
                if r.get('liberarEm', '').startswith('20')]
    ultimo = max([agora, *marcados])
    fila = proximos(ultimo)
    novos = []
    for r in receitas:
        if r.get('liberarEm') == 'aguardando-foto' and not r.get('fotoProvisoria'):
            r['liberarEm'] = next(fila).isoformat()
            novos.append((r['nome'], r['liberarEm']))
    RECEITAS.write_text(json.dumps(receitas, ensure_ascii=False, indent=2) + '\n')
    return novos


if __name__ == '__main__':
    for nome, quando in agendar():
        print(f'{quando}  {nome}')
