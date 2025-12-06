import { describe, it, expect } from 'vitest'
import matchesFilter from '../src/lib/filter'

const boardUsers = [ { id: 'u1', name: 'Alice', email: 'alice@example.com' }, { id: 'u2', name: 'Bob', email: 'bob@example.com' } ]

describe('matchesFilter', () => {
  it('matches title', () => {
    const task = { title: 'Implement login' }
    expect(matchesFilter(task as any, 'login', boardUsers)).toBe(true)
  })

  it('matches description', () => {
    const task = { title: 'Task', description: 'Fix the signup flow' }
    expect(matchesFilter(task as any, 'signup', boardUsers)).toBe(true)
  })

  it('matches assignee name', () => {
    const task = { title: 'Task', assigneeId: 'u1' }
    expect(matchesFilter(task as any, 'alice', boardUsers)).toBe(true)
  })

  it('matches label name', () => {
    const task = { title: 'Task', labels: [{ id: 'l1', name: 'bug' }] }
    expect(matchesFilter(task as any, 'bug', boardUsers)).toBe(true)
  })

  it('returns false for non-matches', () => {
    const task = { title: 'Task', description: 'No match' }
    expect(matchesFilter(task as any, 'xyz', boardUsers)).toBe(false)
  })
})
