from pathlib import Path
p=Path('pages/vulcan-observatory/index.vue')
text=p.read_text()
marker='<!-- DEFRAG_MARK -->'
if marker not in text:
    marker_text='\n\n<!-- DEFRAG_MARK -->\nconst state = shared\n</script>\n\n<script>\nthis second fragment is a leftover shell; defeq.vue block should target this exact line\n</script>\n'
    raise SystemExit('marker not found')
print('marker present')
