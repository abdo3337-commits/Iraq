import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from './styles';

interface DocumentType {
  id: string;
  type: 'national_id' | 'driving_license' | 'vehicle_registration' | 'insurance' | 'vehicle_photos';
  title: string;
  description: string;
  icon: string;
  required: boolean;
  multiple: boolean;
  acceptedFormats: string[];
}

interface UploadedDocument {
  id: string;
  type: string;
  filename: string;
  uri: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
  rejectionReason?: string;
}

interface DocumentUploadProps {
  visible: boolean;
  onClose: () => void;
  onDocumentsUploaded: (documents: UploadedDocument[]) => void;
  initialDocuments?: UploadedDocument[];
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'national_id',
    type: 'national_id',
    title: 'بطاقة الهوية الوطنية',
    description: 'صورة واضحة لوجهي البطاقة الوطنية',
    icon: 'id-card',
    required: true,
    multiple: true, // Front and back
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  {
    id: 'driving_license',
    type: 'driving_license',
    title: 'إجازة السوق',
    description: 'صورة واضحة لإجازة السوق السارية المفعول',
    icon: 'car-sport',
    required: true,
    multiple: true, // Front and back
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  {
    id: 'vehicle_registration',
    type: 'vehicle_registration',
    title: 'سنوية السيارة',
    description: 'وثيقة تسجيل السيارة (السنوية) السارية',
    icon: 'document-text',
    required: true,
    multiple: false,
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  {
    id: 'insurance',
    type: 'insurance',
    title: 'وثيقة التأمين',
    description: 'وثيقة تأمين السيارة السارية المفعول',
    icon: 'shield-checkmark',
    required: true,
    multiple: false,
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  {
    id: 'vehicle_photos',
    type: 'vehicle_photos',
    title: 'صور السيارة',
    description: 'صور واضحة للسيارة من الخارج والداخل',
    icon: 'camera',
    required: true,
    multiple: true,
    acceptedFormats: ['image/jpeg', 'image/png'],
  },
];

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://aburide.preview.emergentagent.com';

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  visible,
  onClose,
  onDocumentsUploaded,
  initialDocuments = [],
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تحذير', 'نحتاج إذن الوصول للصور لتحميل المستندات');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (docType: DocumentType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'اختر مصدر الصورة',
      'كيف تريد إضافة المستند؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'الكاميرا',
          onPress: () => openCamera(docType),
        },
        {
          text: 'المعرض',
          onPress: () => openGallery(docType),
        },
        {
          text: 'ملف',
          onPress: () => openDocuments(docType),
        },
      ]
    );
  };

  const openCamera = async (docType: DocumentType) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(docType, result.assets[0]);
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء فتح الكاميرا');
    }
  };

  const openGallery = async (docType: DocumentType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: docType.multiple,
      });

      if (!result.canceled) {
        for (const asset of result.assets) {
          await uploadDocument(docType, asset);
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة');
    }
  };

  const openDocuments = async (docType: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: docType.acceptedFormats,
        multiple: docType.multiple,
      });

      if (!result.canceled) {
        const files = Array.isArray(result.assets) ? result.assets : [result.assets];
        for (const file of files) {
          await uploadDocument(docType, file as any);
        }
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار المستند');
    }
  };

  const uploadDocument = async (docType: DocumentType, file: any) => {
    try {
      setUploading(docType.id);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || file.mimeType || 'image/jpeg',
        name: file.fileName || file.name || `document_${Date.now()}.jpg`,
      } as any);
      formData.append('document_type', docType.type);

      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/drivers/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        const newDocument: UploadedDocument = {
          id: result.id || Date.now().toString(),
          type: docType.type,
          filename: file.fileName || file.name || 'document.jpg',
          uri: file.uri,
          status: 'pending',
          uploadedAt: new Date(),
        };

        setDocuments(prev => [...prev.filter(d => d.type !== docType.type || docType.multiple), newDocument]);
        
        Alert.alert('نجح التحميل', `تم تحميل ${docType.title} بنجاح`);
      } else {
        const error = await response.json();
        Alert.alert('خطأ في التحميل', error.message || 'فشل في تحميل المستند');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء رفع المستند');
    } finally {
      setUploading(null);
    }
  };

  const removeDocument = (documentId: string) => {
    Alert.alert(
      'حذف المستند',
      'هل أنت متأكد من حذف هذا المستند؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            setDocuments(prev => prev.filter(d => d.id !== documentId));
          },
        },
      ]
    );
  };

  const getDocumentsByType = (type: string) => {
    return documents.filter(doc => doc.type === type);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'rejected': return Colors.error;
      default: return Colors.warning;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'rejected': return 'مرفوض';
      default: return 'قيد المراجعة';
    }
  };

  const isDocumentTypeComplete = (docType: DocumentType) => {
    const docs = getDocumentsByType(docType.type);
    if (docType.multiple) {
      return docs.length > 0;
    }
    return docs.length === 1;
  };

  const getCompletionPercentage = () => {
    const requiredTypes = DOCUMENT_TYPES.filter(dt => dt.required);
    const completedTypes = requiredTypes.filter(dt => isDocumentTypeComplete(dt));
    return Math.round((completedTypes.length / requiredTypes.length) * 100);
  };

  const handleSubmit = () => {
    const completionPercentage = getCompletionPercentage();
    
    if (completionPercentage < 100) {
      Alert.alert(
        'مستندات ناقصة',
        `لقد أكملت ${completionPercentage}% من المستندات المطلوبة. هل تريد المتابعة؟`,
        [
          { text: 'مراجعة المستندات', style: 'cancel' },
          {
            text: 'حفظ والمتابعة',
            onPress: () => {
              onDocumentsUploaded(documents);
              onClose();
            },
          },
        ]
      );
    } else {
      onDocumentsUploaded(documents);
      onClose();
    }
  };

  const renderDocumentType = (docType: DocumentType) => {
    const typeDocs = getDocumentsByType(docType.type);
    const isComplete = isDocumentTypeComplete(docType);

    return (
      <View key={docType.id} style={styles.documentTypeContainer}>
        <View style={styles.documentTypeHeader}>
          <View style={styles.documentTypeInfo}>
            <View style={[styles.documentIcon, { backgroundColor: `${Colors.primary}20` }]}>
              <MaterialIcons name={docType.icon as any} size={24} color={Colors.primary} />
            </View>
            <View style={styles.documentTextInfo}>
              <Text style={styles.documentTitle}>
                {docType.title}
                {docType.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>
              <Text style={styles.documentDescription}>{docType.description}</Text>
            </View>
          </View>
          
          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}
        </View>

        {/* Uploaded Documents */}
        {typeDocs.length > 0 && (
          <View style={styles.uploadedDocuments}>
            {typeDocs.map((doc) => (
              <View key={doc.id} style={styles.documentItem}>
                <TouchableOpacity
                  style={styles.documentPreview}
                  onPress={() => setSelectedImage(doc.uri)}
                >
                  {doc.uri.includes('.pdf') ? (
                    <View style={styles.pdfPreview}>
                      <MaterialIcons name="picture-as-pdf" size={32} color={Colors.error} />
                    </View>
                  ) : (
                    <Image source={{ uri: doc.uri }} style={styles.documentImage} />
                  )}
                </TouchableOpacity>
                
                <View style={styles.documentItemInfo}>
                  <Text style={styles.documentFilename} numberOfLines={1}>
                    {doc.filename}
                  </Text>
                  <View style={styles.documentStatus}>
                    <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                      {getStatusText(doc.status)}
                    </Text>
                  </View>
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <Text style={styles.rejectionReason}>{doc.rejectionReason}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeDocument(doc.id)}
                >
                  <Ionicons name="trash" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploading === docType.id && styles.uploadButtonLoading,
          ]}
          onPress={() => pickImage(docType)}
          disabled={uploading === docType.id}
        >
          {uploading === docType.id ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={Colors.primary} />
              <Text style={styles.uploadButtonText}>
                {typeDocs.length > 0 
                  ? (docType.multiple ? 'إضافة المزيد' : 'تغيير المستند')
                  : 'تحميل المستند'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>رفع المستندات</Text>
          <Text style={styles.completionBadge}>{getCompletionPercentage()}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${getCompletionPercentage()}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            اكتمال المستندات: {getCompletionPercentage()}%
          </Text>
        </View>

        {/* Documents List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.instructionsContainer}>
            <MaterialIcons name="info" size={20} color={Colors.info} />
            <Text style={styles.instructionsText}>
              يرجى رفع جميع المستندات المطلوبة بوضوح. ستتم مراجعة المستندات خلال 24-48 ساعة.
            </Text>
          </View>

          {DOCUMENT_TYPES.map(renderDocumentType)}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {getCompletionPercentage() === 100 ? 'إرسال للمراجعة' : 'حفظ والمتابعة'}
            </Text>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Image Preview Modal */}
        {selectedImage && (
          <Modal visible={!!selectedImage} transparent animationType="fade">
            <View style={styles.imageModalContainer}>
              <TouchableOpacity 
                style={styles.imageModalBackground}
                onPress={() => setSelectedImage(null)}
              >
                <View style={styles.imageModalContent}>
                  <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
                  <TouchableOpacity 
                    style={styles.closeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    ...Shadows.small,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  completionBadge: {
    backgroundColor: Colors.primary,
    color: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.sectionBackground,
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  instructionsText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  documentTypeContainer: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  documentTypeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  documentTypeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  documentTextInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  requiredStar: {
    color: Colors.error,
  },
  documentDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  completeBadge: {
    marginLeft: Spacing.sm,
  },
  uploadedDocuments: {
    marginBottom: Spacing.md,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.sectionBackground,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  documentPreview: {
    width: 60,
    height: 45,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.sm,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pdfPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentItemInfo: {
    flex: 1,
  },
  documentFilename: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  rejectionReason: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs / 2,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: Spacing.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sectionBackground,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  uploadButtonLoading: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    position: 'relative',
    width: '90%',
    height: '70%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: Spacing.sm,
  },
});

export default DocumentUpload;
export type { UploadedDocument, DocumentType };