class ApiResponse{
    static ok(res, message="Success", data = null) {
        return res.status(200).json({
            success: true,
            data: data,
            message: message
        });
    }

    static created(res, message="Created", data = null) {
        return res.status(201).json({
            success: true,
            data: data,
            message: message
        });
    }

    static noContent(res){
        res.status(204).send();
    }
}

export default ApiResponse