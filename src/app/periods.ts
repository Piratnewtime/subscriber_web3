const day = 60 * 60 * 24;

const periods = [
    {
        seconds: day,
        label: 'Every day'
    },
    {
        seconds: day * 7,
        label: 'Weekly'
    },
    {
        seconds: day * 14,
        label: 'Every 2 weeks'
    },
    {
        seconds: day * 30,
        label: 'Monthly'
    },
    {
        seconds: day * 30 * 3,
        label: 'Every 3 months'
    },
    {
        seconds: day * 30 * 6,
        label: 'Every 6 months'
    },
    {
        seconds: day * 30 * 12,
        label: 'Once a year'
    }
];

export default periods;