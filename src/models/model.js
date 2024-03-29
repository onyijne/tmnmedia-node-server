import { pool } from './pool'

class Model {
  constructor(table) {
    this.pool = pool
    this.table = `tmt03_${table}`
    this.pool.on(
      'error',
      (err) => `Error, ${err.code}, was fatal? ${err.fatal}`
    )
    this.result = ''
    this.query = ''
  }

  async select(columns, clause) {
    let query = `SELECT ${columns} FROM ${this.table}`
    if (clause) query += clause
    this.query = query
    return this.query
  }

  async insert(columns, values) {
    const query = `
          INSERT INTO ${this.table} (${columns})
          VALUES (${values})
      `
    await this.pool.query(query, function (error, results, fields) {
      if (error) {
        console.warn(error)
        return
      }
      this.result = results
    })
  }

  async insertQuery(columns, values) {
    this.query = ` INSERT INTO ${this.table} (${columns})
          VALUES (${values})
      `
    return this.query
  }

  async update(columnsToValues, clause) {
    const query = `UPDATE ${this.table} SET ${columnsToValues} ${clause}`
    this.pool.query(query, function (error, results, fields) {
      if (error) {
        console.warn(error)
        return
      }
      this.result = results
    })
  }

}
export default Model;
