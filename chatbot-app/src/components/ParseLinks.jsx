import React from 'react';
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'

const MessageComponents = ({ message }) => {
  return (
    <span className="chat-message-container">
      <ReactMarkdown
        remarkPlugins={[gfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} className="styled-link" target="_blank" rel="noopener noreferrer" />
        }}
      >
        {message}
      </ReactMarkdown>
    </span>
  );
};

export default MessageComponents;
