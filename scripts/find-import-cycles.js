import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..', 'src')
const exts = ['.js', '.jsx', '.ts', '.tsx']

function walk(dir) {
  const res = []
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) res.push(...walk(p))
    else if (stat.isFile() && exts.includes(path.extname(name))) res.push(p)
  }
  return res
}

const files = walk(root)
const importRe = /import\s+[^'";]+\s+from\s+['"](.+)['"]/g

const graph = {}
const fileIndex = {}
files.forEach(f => fileIndex[f] = true)

function resolveImport(from, imp) {
  if (imp.startsWith('.') ) {
    const dir = path.dirname(from)
    let resolved = path.resolve(dir, imp)
    // try extensions and index
    for (const e of exts) {
      if (fs.existsSync(resolved + e)) return resolved + e
    }
    for (const e of exts) {
      if (fs.existsSync(path.join(resolved, 'index' + e))) return path.join(resolved, 'index' + e)
    }
    return null
  }
  return null
}

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8')
  graph[f] = []
  let m
  while ((m = importRe.exec(txt)) !== null) {
    const imp = m[1]
    const resolved = resolveImport(f, imp)
    if (resolved) graph[f].push(resolved)
  }
}

// detect cycles using DFS
const visited = {}
const stack = {}
const cycles = []

function dfs(node, pathSoFar) {
  visited[node] = true
  stack[node] = true
  for (const neigh of graph[node] || []) {
    if (!visited[neigh]) {
      dfs(neigh, pathSoFar.concat(neigh))
    } else if (stack[neigh]) {
      // found cycle: neigh -> ... -> node -> neigh
      const idx = pathSoFar.indexOf(neigh)
      const cycle = (idx === -1 ? [neigh].concat(pathSoFar.concat(node)) : pathSoFar.slice(idx).concat(node, neigh))
      cycles.push(cycle)
    }
  }
  stack[node] = false
}

for (const f of files) {
  if (!visited[f]) dfs(f, [f])
}

if (cycles.length === 0) {
  console.log('No cycles found')
  process.exit(0)
}

console.log('Cycles found:')
const uniq = {}
cycles.forEach((c, i) => {
  const key = c.join(' -> ')
  if (uniq[key]) return
  uniq[key] = true
  console.log('--- Cycle', i+1, '---')
  c.forEach(p => console.log(p.replace(root + path.sep, 'src' + path.sep)))
})
