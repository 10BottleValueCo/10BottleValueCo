import server from '../wordpress-preview-server/server.cjs';
export default typeof server === 'function' ? server : server.default;
