import mysql from 'mysql'
import dotenv from 'dotenv'
import { connectionConfigDev, connectionConfig } from '../settings'

dotenv.config()
export const pool = mysql.createPool(connectionConfig)
