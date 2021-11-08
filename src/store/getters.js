const getters = {
  robots: ({ robots }) => robots,
  robot: ({ robots }) => {
    return (deriv_token) => robots[deriv_token]
  },
  today: ({ today }) => today,
  apiUrl: ({ apiUrl }) => apiUrl,
  traderApiUrl: ({ traderApiUrl }) => traderApiUrl,
  appId: ({ appId }) => appId,
  botUsers: ({ botUsers }) => botUsers,
  botUser: ({ botUsers }) => {
    return (username) => botUsers[username]
  },
  testRobots: ({ testRobots }) => testRobots,
  testRobot: ({ testRobots }) => {
    return (deriv_token) => testRobots[deriv_token]
  },
  traderRobot: ({ traderRobots }) => {
    return (deriv_account) => traderRobots[deriv_account]
  },
  traderRobots: ({ traderRobots }) => traderRobots,
  signalRobot: ({ signalRobots }) => {
    return (deriv_account) => signalRobots[deriv_account]
  },
  signalRobots: ({ signalRobots }) => signalRobots,
}
export default getters
