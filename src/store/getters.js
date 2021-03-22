const getters = {
	robots: ({ robots }) => robots,
	robot: ({ robots }) => { return function(deriv_token) {return robots[deriv_token]} },
	today: ({ today }) => today,
	apiUrl: ({ apiUrl }) => apiUrl
}
export default getters