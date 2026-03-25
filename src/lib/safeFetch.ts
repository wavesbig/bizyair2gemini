/**
 * 安全 fetch 封装，防止解析 HTML 为 JSON
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any; isJson: boolean }> {
  const response = await fetch(url, options)

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json') ?? false

  let data: any
  if (!response.ok) {
    // 即使请求失败，也尝试解析 JSON 错误
    if (isJson) {
      try {
        data = await response.json()
      } catch {
        data = { error: `HTTP ${response.status}` }
      }
    } else {
      data = { error: `HTTP ${response.status}` }
    }
    return { ok: false, status: response.status, data, isJson }
  }

  if (isJson) {
    try {
      data = await response.json()
    } catch (e) {
      data = { error: 'Failed to parse JSON' }
      return { ok: false, status: response.status, data, isJson: false }
    }
  } else {
    data = { error: 'Not JSON response' }
    return { ok: false, status: response.status, data, isJson: false }
  }

  return { ok: true, status: response.status, data, isJson }
}
