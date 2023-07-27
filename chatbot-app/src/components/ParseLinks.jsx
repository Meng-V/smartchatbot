import React from 'react';
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import { Text } from '@chakra-ui/react';
const MessageComponents = ({ message }) => {
  // const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;

  const formattedMessage = message.split('\n').map((line, index) => 
    <React.Fragment key={index}>
      <ReactMarkdown 
        remarkPlugins={[gfm]} 
        components={{ 
          a: ({node, ...props}) => <a {...props} className="styled-link" target="_blank" rel="noopener noreferrer"/>
        }}
        
      >
        
        <Text color={"black"}>
          {line}</Text>
      </ReactMarkdown>
    </React.Fragment>
  );

  return <>{formattedMessage}</>;
};

//   return (
//       <div>
//         {
//           // Split the message into lines by \n
//           message.split('\n').map((line, index) => 
//             // For each line, split it into segments by URL
//             <div key={index}>
//               {
//                 line.split(urlPattern).map((segment, segmentIndex) =>
//                   // If the segment is a URL, render it as a link, otherwise as plain text
//                   urlPattern.test(segment)
//                     ? <a href={segment} target="_blank" rel="noopener noreferrer" key={segmentIndex} className='styled-link'>{segment}</a>
//                     : segment
//                 )
//               }
//             </div>
//           )
//         }
//       </div>
//     )
  
// }

export default MessageComponents;