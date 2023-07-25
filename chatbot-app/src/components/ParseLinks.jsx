import React from 'react';

function MessageWithLinks({ message }) {
  // Regular expression to match URLs
  const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;

  return (
    <div>
      {
        // Split the message into lines by \n
        message.split('\n').map((line, index) => 
          // For each line, split it into segments by URL
          <div key={index}>
            {
              line.split(urlPattern).map((segment, segmentIndex) =>
                // If the segment is a URL, render it as a link, otherwise as plain text
                urlPattern.test(segment)
                  ? <a href={segment} target="_blank" rel="noopener noreferrer" key={segmentIndex} className='styled-link'>{segment}</a>
                  : segment
              )
            }
          </div>
        )
      }
    </div>
  );
}

export default MessageWithLinks;