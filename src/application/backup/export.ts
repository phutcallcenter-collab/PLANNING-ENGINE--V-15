export function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2)

  const blob = new Blob([json], {
    type: 'application/json;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'

  document.body.appendChild(a)
  a.click()

  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
