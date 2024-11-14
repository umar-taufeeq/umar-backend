import { v2 as cloudinary} from "cloudinary"
import fs from "fs"


    // Configuration
    cloudinary.config({ 
        cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });


    const uploadOnCloudinary = async(localFilPath)=>{
        try {
            if(!localFilPath)return null
            //upload the file on cloudinary
            const response =await cloudinary.uploader.upload(localFilPath,{
                resource_type:"auto"
            })
            //file has been succesfully uploaded
            console.log("file is uploaded on cloudinary",response.url);
            return response;
            
        } catch (error) {
            fs.unlinkSync(localFilPath)//remove the locally saved temporary file as then upload operation got failed
            return null;

        }
    }
    export {uploadOnCloudinary}