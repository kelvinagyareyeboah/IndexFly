export interface SearchResult {
  doc_id: number
  name: string
  score: number
  snippet: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  total: number
  page: number
  pages: number
  limit: number
}

export interface StatsResponse {
  docs: number
  terms: number
  avg_dl: number
}
