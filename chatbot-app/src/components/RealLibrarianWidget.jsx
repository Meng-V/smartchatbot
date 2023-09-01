import { Box } from "@chakra-ui/react";

const RealLibrarianWidget = () => {
    return (
        <Box height="60vh" overflowY="auto">
            <iframe src="https://libanswers.lib.miamioh.edu/chat/widget/a24a929728c7ee2cfdef2df20cbbc2ee" title="Chat Widget" onScroll={false} height="100%"/>
        </Box>
    )
}

export default RealLibrarianWidget;