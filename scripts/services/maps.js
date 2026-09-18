import axios from "axios";

export const createMap = async (map) => {
    try{
        var response = await axios.post("http://localhost:5064/maps", map);

        return response.status;
    } catch(e) {
        console.error(e);
    }
}