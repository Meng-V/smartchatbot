import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'

/**
 * This component is used to parse links in the chat messages
 */
const MessageComponents = ({ msg }) => {
  // Replace multiple new lines with a single new line
  const message = msg.replace(/\n\n+/g, '\n');
  return (
    <span className="chat-message-container">
      <ReactMarkdown
        remarkPlugins={[gfm]}
        // Used to customize the rendering of links
        // [noopener noreferrer] improves security when opening links in a new tab
        components={{
          a: ({ ...props }) => <a {...props} className="styled-link" target="_blank" rel="noopener noreferrer" />
        }}
      >
        {message}
      </ReactMarkdown>
    </span>
  );
};

export default MessageComponents;
