import "dotenv/config";
import axios from "axios";

(async () => {
  try {
    const res = await axios.get(
      "https://cloud.leonardo.ai/api/rest/v2/me",
      {
        headers: {
          Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
        },
      }
    );

    console.log(res.data);
  } catch (err: any) {
    console.log(err.response?.status);
    console.dir(err.response?.data, { depth: null });
  }
})();