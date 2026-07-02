import { queryOne, query } from './db'

export type PolicyVersion = {
  id: string
  policy_type: string
  version: string
  title: string
  content: string
  effective_date: string
  updated_at: string
  summary: string | null
}

export async function getLatestPolicy(type: string): Promise<PolicyVersion | null> {
  return queryOne<PolicyVersion>(
    `SELECT id, policy_type, version, title, content, effective_date, updated_at, summary
     FROM policy_versions
     WHERE policy_type = $1 AND published = true
     ORDER BY effective_date DESC, created_at DESC
     LIMIT 1`,
    [type]
  ).catch(() => null)
}

export async function getAllPolicyHistory(): Promise<PolicyVersion[]> {
  return query<PolicyVersion>(
    `SELECT id, policy_type, version, title, effective_date, updated_at, summary
     FROM policy_versions
     WHERE published = true
     ORDER BY effective_date DESC, policy_type, created_at DESC`
  ).catch(() => [])
}
