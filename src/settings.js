import dotenv from 'dotenv'
// "googleapis": "^61.0.0",
dotenv.config()
export const connectionString = process.env.CONNECTION_STRING
export const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS
export const connectionConfig = {
  connectionLimit : 100,
  host            : 'tmnmedia.com.ng',
  user            : 'node',
  password        : 'SqlForTmnmedia2020',
  database        : 'signal_app'
}
export const connectionConfigDev = {
  connectionLimit : 100,
  host            : 'localhost',
  user            : 'codex',
  password        : 'chinedu',
  database        : 'tmnmedia'
}
