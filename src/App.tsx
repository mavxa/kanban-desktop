import { BoardScreen } from "./features/board/BoardScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BoardScreen />
    </QueryClientProvider>
  );
}

export default App;
