export const imagesLoadRequestDto = (params) => {
    return {
        type: params.imageType,
        name: params.fileName,
    }
}