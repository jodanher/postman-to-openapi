'use strict'

const marked = require('marked')
const supHeaders = ['object', 'name', 'description', 'example', 'type', 'required']

function parseMdTable(md) {
  const parsed = marked.lexer(md)
  const table = parsed.find(el => el.type === 'table')
  if (table == null) return {}
  const { header, cells } = table
  if (!header.includes('object') || !header.includes('name')) return {}
  const headers = header.map(h => supHeaders.includes(h) ? h : false)
  const tableObj = cells.reduce((accTable, cell, i) => {
    const cellObj = cell.reduce((accCell, field, index) => {
      if (headers[index]) {
        accCell[headers[index]] = field
      }
      return accCell
    }, {})
    accTable[cellObj.name] = cellObj
    return accTable
  }, {})
  return tableObj
}

const groupReduce = (acc, cur) => {
  const { body, code, status } = cur
  const example = body && JSON.parse(body)
  const value = (example.length) ? [...example] : { ...example }
  const data = { code, value, status }

  return acc[code] ? { ...acc, [code]: [...acc[code], { ...data }] } : { ...acc, [code]: [{ ...data }] }
}

const groupByCode = (responses) => responses.reduce(groupReduce, {})

const parseResponsesByCode = (group) => group.reduce((acc, cur, i) => {
  const { value, code, status } = cur

  const examples = acc[code]?.content['application/json']?.examples || {}
  return {
    ...acc,
    [code]: {
      description: code >= 300 ? `Error ${status}` : `Successful ${status}`,
      content: {
        'application/json': {
          examples: {
            ...examples,
            [`example${i}`]: { value }
          }
        }
      }
    }
  }
}, {});

const parseResponseByCode = (group) => group.reduce((acc, cur) => {
  const { value, code, status } = cur
  return {
    ...acc,
    [code]: {
      description: code >= 300 ? `Error ${status}` : `Successful ${status}`,
      content: {
        'application/json': {
          example: { ...value }
        }
      }
    }
  }
}, {});

const parseResponses = (responses) => {
  const groups = groupByCode(responses)
  return Object.keys(groups)
    .reduce((acc, cur) => {
      const key = cur
      const group = groups[key]
      const data = group.length > 1 ? parseResponsesByCode(group) : parseResponseByCode(group)

      return { ...acc, ...data }
    }, {})
}


module.exports = { parseMdTable, parseResponses }
