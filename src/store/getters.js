const getters = {
	robots: ({ robots }) => robots,
	robot: ({ robots }) => { return (deriv_token) => robots[deriv_token] },
	today: ({ today }) => today,
	apiUrl: ({ apiUrl }) => apiUrl,
	appId: ({ appId }) => appId,
	botUsers: ({ botUsers }) => botUsers,
	botUser: ({ botUsers }) => { return (username) => botUsers[username] },
	testRobots: ({ testRobots }) => testRobots,
	testRobot: ({ testRobots }) => { return (deriv_token) => testRobots[deriv_token] }
}
export default getters