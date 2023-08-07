import { AxiosResponse } from "axios";

async function AxiosRetries(
  axiosFunc: (...args: any[]) => Promise<AxiosResponse<any, any>>,
  maxRetries: number = 5
): Promise<AxiosResponse<any, any>> {
  return new Promise<AxiosResponse>(async (resolve, reject) => {
    let retries = 0;
    let response;
    let error: any;
    while (!response && retries < maxRetries) {
      try {
        response = await axiosFunc();
      } catch (e: any) {
        error = e;
      }
      retries++;
    }
    if (response) {
      resolve(response);
    } else {
      reject(error);
    }
  });
}
export { AxiosRetries };
